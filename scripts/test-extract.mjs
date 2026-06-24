import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are extracting structured data from a construction site visit voice transcript.
Return ONLY valid JSON with these exact keys (use null for missing values):
{
  "jobName": string | null,
  "date": ISO date string (YYYY-MM-DD) | null,
  "arrivalTime": ISO datetime string | null,
  "departureTime": ISO datetime string | null,
  "notes": string | null,
  "materialsToOrder": string[],
  "hoursOnSite": decimal string like "3.5" | null
}
hoursOnSite: ONLY calculate this as (departureTime minus arrivalTime) when BOTH are explicitly stated in the transcript. If either time is absent or unclear, set hoursOnSite to null. NEVER estimate or guess a duration. Do not infer missing times from context.
Use today's date if a relative date like "today" is mentioned.
Return only the JSON object, no markdown, no explanation.`;

const EXPECTED_KEYS = [
  "jobName",
  "date",
  "arrivalTime",
  "departureTime",
  "notes",
  "materialsToOrder",
  "hoursOnSite",
];

function validateShape(obj) {
  const missing = EXPECTED_KEYS.filter((k) => !(k in obj));
  if (missing.length) throw new Error(`Missing keys: ${missing.join(", ")}`);
  if (!Array.isArray(obj.materialsToOrder))
    throw new Error("materialsToOrder must be an array");
  if (obj.hoursOnSite !== null && typeof obj.hoursOnSite !== "string")
    throw new Error("hoursOnSite must be a string or null");
  return true;
}

function applyGuard(extracted) {
  // If either time is missing, clear hoursOnSite — never allow an estimated value
  if (!extracted.arrivalTime || !extracted.departureTime) {
    extracted.hoursOnSite = null;
  }
  // Recalculate hoursOnSite from the two times if both are present
  if (extracted.arrivalTime && extracted.departureTime) {
    const arrival = new Date(extracted.arrivalTime).getTime();
    const departure = new Date(extracted.departureTime).getTime();
    if (!isNaN(arrival) && !isNaN(departure) && departure > arrival) {
      extracted.hoursOnSite = ((departure - arrival) / 3_600_000).toFixed(2);
    } else {
      extracted.hoursOnSite = null;
    }
  }
  return extracted;
}

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error("ANTHROPIC_API_KEY not set. Run with: node --env-file=.env scripts/test-extract.mjs");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

async function extract(transcript) {
  const today = new Date().toISOString().slice(0, 10);
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Today's date is ${today}. Use this as the date anchor when the transcript mentions only a time (e.g. "7:30am" becomes "${today}T07:30:00").\n\nTranscript:\n${transcript}`,
      },
    ],
  });
  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const parsed = JSON.parse(jsonText);
  validateShape(parsed);
  return applyGuard(parsed);
}

let failures = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  PASS — ${label}`);
  } else {
    console.log(`  FAIL — ${label}${detail ? ` (${detail})` : ""}`);
    failures++;
  }
}

// Test A — both times present
console.log("Test A — both times present:");
const transcriptA =
  "I was on site from 7:30 to 2pm at the Riverside project. Got the roof framing done.";
try {
  const a = await extract(transcriptA);
  console.log("  Extracted:", JSON.stringify(a));
  assert("arrivalTime non-null", a.arrivalTime !== null, `got ${a.arrivalTime}`);
  assert("departureTime non-null", a.departureTime !== null, `got ${a.departureTime}`);
  assert(
    'hoursOnSite === "6.50"',
    a.hoursOnSite === "6.50",
    `got ${JSON.stringify(a.hoursOnSite)}`
  );
} catch (err) {
  console.log("  FAIL — extraction threw:", err.message);
  failures++;
}

// Test B — only end time
console.log("\nTest B — only end time:");
const transcriptB =
  "Knocked off at 2pm at the Johnson Street job. Still need to order timber.";
try {
  const b = await extract(transcriptB);
  console.log("  Extracted:", JSON.stringify(b));
  assert("arrivalTime null", b.arrivalTime === null, `got ${JSON.stringify(b.arrivalTime)}`);
  assert(
    "hoursOnSite null (enforced by guard)",
    b.hoursOnSite === null,
    `got ${JSON.stringify(b.hoursOnSite)}`
  );
} catch (err) {
  console.log("  FAIL — extraction threw:", err.message);
  failures++;
}

console.log("");
if (failures > 0) {
  console.log(`${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("All assertions passed.");
process.exit(0);
